function run2ptMCR(user_name,num_recon,input_type,correlation_choice,file_name)

%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%%
%%% types of correlation function available %%
% 1 : Two Point Autocorrelation
% 2 : Two point Lineal Path Correlation
% 3 : Two point Cluster Correlation
% 4 : Two point Surface-Surface Correlation
%%%


%% Create Job ID and encrypt it %%
c = clock;  % To record temporal details
year = c(1); month = c(2); date = c(3);hour=c(4); minute=c(5); seconds=c(6); % define all time related variables
c(1) = c(1) + 7;
c(2) = c(2) + 13;
c(3) = c(3) + 17;
Job_ID = [num2str(c(2)),num2str(c(3)),num2str(c(4)),fliplr(num2str(c(1))),num2str(c(5)),num2str(c(6))];
%%%


time_stamp = ['H',num2str(hour),'/','M',num2str(minute),'/','S',num2str(seconds)]; % create a time stamp to store files

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
user_activity = [time_now,' ',(user_name),' ','Reconstruction - Correlation Function Approach',' ',Job_ID];
fileID = fopen('./Activity_log.txt','a+');
fprintf(fileID,'\n%s\n',user_activity);
fclose(fileID);


stamp = [num2str(year),'/',str_month,'/',str_date,'/'];

path_to_file = ['../media/documents/',stamp]; 

% filename of the most recently uploaded
fname = file_name; 
path_to_write = ['/var/www/html/nm/Two_pt_MCR/Reconstruction/',Job_ID]; %% write recon results here 
mkdir(path_to_write); 

%% Specify import function according to input option
switch input_type
    case 1
        img = imread([path_to_file,fname]); % read the incming target and store pixel values
        if max(img(:)) > 1
            img = round(img/256);
        end
        imwrite(256*img,[path_to_write,'/','Input1.jpg']);
        path_to_write = ['/var/www/html/nm/Two_pt_MCR/Reconstruction/',Job_ID,'/Reconstruction'];
        legendInfo{1} = 'Target Image'; % Create legend for plots and variable names to save in .csv
        legendInfo_table{1} = 'Target_Image'; % Create variable names to save in .csv
    case 2 
        img = unzip([path_to_file,fname],[path_to_write,'/input']);
        [target_corrf,L1,L2]=zip_file_processing_recon(path_to_write,correlation_choice);
        path_to_write = ['/var/www/html/nm/Two_pt_MCR/Reconstruction/',Job_ID,'/Reconstruction'];
        legendInfo{1} = 'Mean Of Inputs'; % Create legend for plots and variable names to save in .csv
        legendInfo_table{1} = 'Mean_Of_Inputs'; % Create variable names to save in .csv
        switch correlation_choice
        case 1
        calc_Corr = @evaluate;
        Y_label = 'Two Point Autocorrelation';
        Correlation_name = 'Two_Point_Autocorrelation';
        case 2
        calc_Corr = @L_2D;
        Y_label = 'Two Point Lineal Path Correlation';
        Correlation_name = 'Lineal_Path_Correlation';
        case 3
        calc_Corr = @C2;
        Y_label = 'Two Point Cluster Correlation';
        Correlation_name = 'Cluster_Correlation';
        case 4
        calc_Corr = @Ss_2D;
        Y_label = 'Two Point Surface-Surface Correlation';
        Correlation_name = 'Surface_Correlation';
        end
    case 3
        load([path_to_file,fname]);
        img = Input;
        img_viewable = 256 * img;
        imwrite(img_viewable,[path_to_write,'/','Input1.jpg']);
        path_to_write = ['/var/www/html/nm/Two_pt_MCR/Reconstruction/',Job_ID,'/Reconstruction'];
        legendInfo{1} = 'Target Image'; % Create legend for plots and variable names to save in .csv
        legendInfo_table{1} = 'Target_Image'; % Create variable names to save in .csv
end

mkdir(path_to_write);

if input_type ~= 2
    if length(size(img)) > 2
       img = img(:,:,1);
    end

    if (max(max(img))) > 1
      Target_img = round(img/256);
    else
      Target_img = img;
    end
    
    switch correlation_choice
    case 1
        target_corrf = evaluate(Target_img);
        disp('Using S2');
        calc_Corr = @evaluate;
        Y_label = 'Two Point Autocorrelation';
        Correlation_name = 'Two_Point_Autocorrelation';
    case 2
        target_corrf = L_2D(Target_img);
        disp('Using L2');
        calc_Corr = @L_2D;
        Y_label = 'Two Point Lineal Path Correlation';
        Correlation_name = 'Lineal_Path_Correlation';
    case 3
        target_corrf = C2(Target_img);
        disp('Using C2');
        calc_Corr = @C2;
        Y_label = 'Two Point Cluster Correlation';
        Correlation_name = 'Cluster_Correlation';
    case 4
        target_corrf = Ss_2D(Target_img);
        disp('Using Surf2');
        calc_Corr = @Ss_2D;
        Y_label = 'Two Point Surface-Surface Correlation';
        Correlation_name = 'Surface_Correlation';
    end
    L1 = size(Target_img,1); L2 = size(Target_img,2); % get dimensions of image to be reconstructed
%     S2_target = evaluate(Target_img); % calculate S2 of target
%     L2_target = L_2D(Target_img);
%     Surf2_target = Ss_2D(Target_img);
%     C2_target = C2(Target_img);
%     size_of_recon = size(Target_img,1);
end


recon_corrf = zeros(length(target_corrf),num_recon);
% S2_recon = zeros(length(S2_target),num_recon);
% L2_recon = zeros(length(L2_target),num_recon);
% Surf2_recon = zeros(length(Surf2_target),num_recon);
% C2_recon = zeros(length(C2_target),num_recon);

time_req = zeros(num_recon,1);
error = zeros(num_recon,1);

for i = 1:num_recon
    [Recon_img,time_req(i,1),iter_req,error(i,1)] = two_point_recon(target_corrf,L1,L2,correlation_choice);
%     if i==1
%         mkdir(path_to_write);
% 	imwrite(img,[path_to_write,'/Target.jpg']);
%    end
%     S2_recon(:,i) = evaluate(Recon_img);
%     L2_recon(:,i) = L_2D(Recon_img);
%     Surf2_recon(:,i) = Ss_2D(Recon_img);
%     C2_recon(:,i) = C2(Recon_img);
    recon_corrf(:,i) = calc_Corr(Recon_img);
    imwrite(256*Recon_img,[path_to_write,'/Reconstruct',num2str(i),'.jpg']);
    %save([path_to_write,'/Reconstruct',num2str(i),'.mat'],'Recon_img');
end

%%Plotting%%
figure('color',[1,1,1])
hold on;
plot( 0:1:length(target_corrf)-1, target_corrf , 'LineWidth',2.5);
%Create legend names
for i = 1 : num_recon
	plot( 0:1:length(target_corrf)-1, recon_corrf(:,i), 'LineWidth',2.5);
	legendInfo{i+1} = ['Reconstruction #',num2str(i)];
    legendInfo_table{i+1} = ['Reconstruction',num2str(i)];
end
xlabel('Distance (Pixel)');
ylabel(Y_label);
box on;
legend(legendInfo);
saveas(gcf,[path_to_write,'/Correlation Comparison.jpg']);
hold off;

% figure('color',[1,1,1])
% hold on;
% plot( 0:1:length(L2_target)-1, L2_target , 'LineWidth',2.5);
% for i = 1 : num_recon
% 	plot( 0:1:length(L2_target)-1, L2_recon(:,i), 'LineWidth',2.5);
% end
% xlabel('Distance (Pixel)');
% ylabel('2-point Lineal Path Function');
% box on;
% legend(legendInfo);
% saveas(gcf,[path_to_write,'/Lineal Path_Comparison.jpg']);
% hold off;
% 
% figure('color',[1,1,1])
% hold on;
% plot( 0:1:length(C2_target)-1, C2_target , 'LineWidth',2.5);
% for i=1:num_recon
% 	plot( 0:1:length(C2_target)-1, C2_recon(:,1),'LineWidth',2.5);
% end
% xlabel('Distance (Pixel)');
% ylabel('2-point Cluster Correlation Function');
% box on;
% legend(legendInfo);
% saveas(gcf,[path_to_write,'/Cluster Correlation_Comparison.jpg']);
% hold off;
% 
% figure('color',[1,1,1])
% hold on;
% plot( 0:1:length(Surf2_target)-1, Surf2_target , 'LineWidth',2.5);
% for i=1:num_recon
% 	plot( 0:1:length(Surf2_target)-1, Surf2_recon(:,1),'LineWidth',2.5);
% end
% xlabel('Distance (Pixel)');
% ylabel('2-point Surface Correlation Function');
% box on;
% legend(legendInfo);
% saveas(gcf,[path_to_write,'/Surface Correlation_Comparison.jpg']);
% hold off;

%% Saving Useful Data %%
%Concatenate correlations and convert them to table
Correlation = cat(2,target_corrf,recon_corrf); Correlation = array2table(Correlation); 
% S2 = cat(2,S2_target,S2_recon); S2 = array2table(S2); 
% L2 = cat(2,L2_target,L2_recon); L2 = array2table(L2); 
% Cluster2 = cat(2,C2_target,C2_recon); Cluster2 = array2table(Cluster2); 
% Surface2 = cat(2,Surf2_target,Surf2_recon); Surface2 = array2table(Surface2); 

% Rename variables in table appropriately
Correlation.Properties.VariableNames = legendInfo_table;
% S2.Properties.VariableNames = legendInfo_table;
% L2.Properties.VariableNames = legendInfo_table;
% Cluster2.Properties.VariableNames = legendInfo_table;
% Surface2.Properties.VariableNames = legendInfo_table;

% Save tables
writetable(Correlation,[path_to_write,'/',Correlation_name,'.csv']);
% writetable(S2,[path_to_write,'/','Autocorrelation.csv']);
% writetable(L2,[path_to_write,'/','Lineal_Path_Correlation.csv']);
% writetable(Cluster2,[path_to_write,'/','Cluster_Correlation.csv']);
% writetable(Surface2,[path_to_write,'/','Surface_Correlation.csv']);
% save([path_to_write,'/2 Point Autocorrelation.mat'],'S2');
% save([path_to_write,'/2 Point Lineal Path Correlation.mat'],'L2');
% save([path_to_write,'/2 Point Cluster Correlation.mat'],'Cluster2');
% save([path_to_write,'/2 Point Surface Correlation.mat'],'Surface2');

%%
delete_path = ['/home/NANOMINE/Production/mdcs/Two_pt_MCR/media/documents/',stamp]
delete delete_path;

%% ZIP files %%
path_to_zip = ['/var/www/html/nm/Two_pt_MCR/Reconstruction/',Job_ID];
zip([path_to_zip,'/Results.zip'],{'*'},path_to_zip);
%% Email to user%%
To = ['To:',user_name];
Subject = ['Subject: Reconstruction complete for Job ID: ',Job_ID];
Content = 'Content-Type:text/html; charset="us-ascii"';
html_headers = '<html><body>';
%NM_logo = '<img src=''http://129.105.90.149/nm/NanoMine-logo.JPG''>';
Body1 = '<p>Greeting from NanoMine!</p>';
Body2 = '<p>You are receiving this email because you had submitted an image for reconstruction using 2 point correlation.';
Body3 = ['The reconstruction process is complete and you can view the results','<a href= http://nanomine.northwestern.edu:8000/Two_pt_MCR_view_result.html?foo=',num2str(Job_ID),'&submit=Send> here</a></p>'];
Body4 = '<p>Best Wishes,</p>';
Body5 = '<p>NanoMine Team.</p>';
Footer1 = '<p>***DO NOT REPLY TO THIS EMAIL***</p>';
html_footer = '</body></html>';
Body = [Body2,Body3];

fileID = fopen('/home/NANOMINE/Production/mdcs/Two_pt_MCR/email.html','wt+');
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
