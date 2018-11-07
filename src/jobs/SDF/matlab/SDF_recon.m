function SDF_recon(user_name,input_type,num_recon,file_name)

%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%%
%% Create Job ID and encrypt it %%
c = clock;  % To record temporal details
year = c(1); month = c(2); date = c(3);hour=c(4); minute=c(5); seconds=c(6); % define all time related variables
c(1) = c(1) + 7;
c(2) = c(2) + 13;
c(3) = c(3) + 17;
Job_ID = [num2str(c(2)),num2str(c(3)),num2str(c(4)),fliplr(num2str(c(1))),num2str(c(5)),num2str(c(6))];
%%%

time_stamp = ['H',num2str(hour),'/','M',num2str(minute)]; % create a time stamp to store files

if month < 10 % convert single digit to double
    str_month = ['0',num2str(month)];
else
    str_month = num2str(month);
end

if date < 10
   str_date = ['0',num2str(date)];
else
   str_date = num2str(date);
end

%% Write to Activity log %%
time_now= [num2str(year),':',num2str(month),':',num2str(date),':',num2str(hour),':',num2str(minute),':',num2str(seconds)];
user_activity = [time_now,' ',(user_name),' ','Reconstruction - SDF',' ',Job_ID];
addpath('/home/NANOMINE/Develop/mdcs');
fileID = fopen('/home/NANOMINE/Production/mdcs/Activity_log.txt','a+');
fprintf(fileID,'\n%s\n',user_activity);
fclose(fileID);

stamp = [num2str(year),'/',str_month,'/',str_date,'/'];

path_to_file = ['../media/documents/',stamp]; 

fname = file_name; % incoming file name
path_to_write = ['/var/www/html/nm/SDF/Reconstruction/',Job_ID];
mkdir(path_to_write);

%% Specify import function according to input option
switch input_type
    case 1
        img = imread([path_to_file,fname]); % read the incming target and store pixel values
        
        if length(size(img)) > 3
            img_original = img(:,:,1:3);
        else
            img_original = img;
        end
        if max(img_original(:)) > 1
            imwrite(img_original,[path_to_write,'/','Input1.jpg'])
            img_original = round(img_original/256);
        else
            imwrite(256*img_original,[path_to_write,'/','Input1.jpg'])
        end
    case 2 
        unzip([path_to_file,fname],[path_to_write,'/input']);
    case 3
        load([path_to_file,fname]);
        img_original = Input;
        imwrite(256*img_original,[path_to_write,'/','Input1.jpg']);
end

if input_type ~= 2
    %% SDF code - Shuangchen & Yichi
    % img_original - binary original image
    img_original = double(img_original);
    vf = mean(img_original(:));
    pixel = size(img_original,1);
    sdf2d = fftshift(abs(fft2(img_original-vf)).^2); % 2D sdf
    sdf1d = FFT2oneD(sdf2d); % 1D sdf ** removed transpose to make it a coloumn vector **
    S2_target = evaluate(img_original);
     csvwrite([path_to_write,'/Input_SDF_2D.csv'],sdf2d);
     csvwrite([path_to_write,'/Input_SDF_1D.csv'],sdf1d);

    % plot 2d SDF and save image
    figure('color',[1,1,1])
    hold on;
    clims = [5e3 5e4];
    map = [0.0, 0, 0
         1.0, 0.5, 0
         1.0, 1.0, 0
         1.0, 0, 0];
    imagesc(sdf2d,clims); colormap(map);
    xlim([0 size(img_original,1)]); ylim([0 size(img_original,2)]);
    set(gca,'xtick',[]); set(gca,'ytick',[]);
    saveas(gcf,[path_to_write,'/SDF_2D.jpg']);
    hold off;
    % create the required number of reconstructions
    S2_recon = zeros(length(S2_target),num_recon);
    for ii = 1 : num_recon
        img_recon = Microstructure_generator(sdf1d', 'custom', vf, pixel);
        imwrite(256*img_recon,[path_to_write,'/Reconstruct',num2str(ii),'.jpg']); % write reconstructed image
        % Compute auto-corrrelation for reconstructions 
        S2_recon(:,ii) = evaluate(img_recon);
    end
    S2_all = cat(2,S2_target,S2_recon);
else 
    S2_all = zip_file_processing_SDFrecon(path_to_write,num_recon);
end

% Plot correlation comparison
figure('color',[1,1,1])
hold on;

for i = 1 : num_recon+1
    plot(0:1:length(S2_all(:,i))-1, S2_all(:,i) , 'LineWidth',2.5);
    if i==1
        legendInfo{i} = 'Input Image';
	if input_type == 2
		 legendInfo{i} = 'Mean of Input Images';
	end
    else
        legendInfo{i} = ['Reconstruction #',num2str(i-1)]; % for variable name in table
    end
    hold on;
end

xlabel('Distance (Pixel)');
ylabel('Autocorrelation Function');
box on;
legend(legendInfo);
saveas(gcf,[path_to_write,'/','Autocorrelation_comparison.jpg']);
hold off;


%% ZIP files %%
zip([path_to_write,'/Results.zip'],{'*'},path_to_write);

%% Email to user%%
To = ['To:',user_name];
Subject = ['Subject: Reconstruction complete for Job ID: ',Job_ID];
Content = 'Content-Type:text/html; charset="us-ascii"';
html_headers = '<html><body>';
%NM_logo = '<img src=''http://129.105.90.149/nm/NanoMine-logo.JPG''>';
Body1 = '<p>Greeting from NanoMine!</p>';
Body2 = '<p>You are receiving this email because you had submitted an image for reconstruction using Spectral Density Function.';
Body3 = ['The reconstruction process is complete and you can view the results','<a href= http://nanomine.northwestern.edu:8000/SDFrecon_view_Result.html?foo=',num2str(Job_ID),'&submit=Send> here</a></p>'];
Body4 = '<p>Best Wishes,</p>';
Body5 = '<p>NanoMine Team.</p>';
Footer1 = '<p>***DO NOT REPLY TO THIS EMAIL***</p>';
html_footer = '</body></html>';
Body = [Body2,Body3];

fileID = fopen('/home/NANOMINE/Production/mdcs/SDF/email.html','wt+');
fprintf(fileID,'%s\n',To);
fprintf(fileID,'%s\n',Subject);
fprintf(fileID,'%s\n',Content);
fprintf(fileID,'%s\n',html_headers);
%fprintf(fileID,'%s\n',NM_logo);
fprintf(fileID,'\n%s\n',Body1);
fprintf(fileID,'\n%s\n',Body);
fprintf(fileID,'\n%s\n',Body4);
fprintf(fileID,'%s\n',Body5);
fprintf(fileID,'\n%s\n',Footer1);
fprintf(fileID,'%s\n',html_footer);
fclose(fileID);
end
