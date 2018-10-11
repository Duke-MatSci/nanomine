function Characterize(user_name,input_type,file_name)

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
user_activity = [time_now,' ',(user_name),' ','Binarization - Otsu',' ',Job_ID];
addpath('/home/NANOMINE/Develop/mdcs');
fileID = fopen('/home/NANOMINE/Production/mdcs/Activity_log.txt','a+');
fprintf(fileID,'\n%s\n',user_activity);
fclose(fileID);

stamp = [num2str(year),'/',str_month,'/',str_date,'/'];

path_to_file = ['../media/documents/',stamp];

fname = file_name; % incoming file name
path_to_write = ['/var/www/html/nm/Binarization/Otsu/',Job_ID];
mkdir(path_to_write);

%% Specify import function according to input option
switch input_type
    case 1
        img = imread([path_to_file,fname]); % read the incming target and store pixel values
        if size(img) > 1
            imwrite(img(:,:,1),[path_to_write,'/','Input1.jpg'])
        end
    case 2
        img = unzip([path_to_file,fname],[path_to_write,'/input']);
    case 3
        load([path_to_file,fname]);
        img = Input;
        imwrite(img,[path_to_write,'/','Input1.jpg']);
end

if input_type ~= 2
    if length(size(img)) > 2
       img = img(:,:,1);
    end
    Target = double(img);
    Target = Target/256; % convert to grayscale
    % Otsu Method
    level = graythresh(Target);
    Target_binarized = im2bw(Target,level);
    %Save binarized image
    imwrite(Target_binarized,[path_to_write,'/','Binarized_Input1.jpg']);
    % record data to be written in CSV file
    input_name{1,1} = fname; % name of input file processed in i'th loop
    renamed_image{1,1} = 'Input1.jpg'; % file is renamed according to order of processing
    binarized_image{1,1} = 'Binarized_Input1.jpg'; % binarized image name
    vol_fr(1,1) = mean(Target_binarized(:));
    % create  a struct element S to stor eit
    S.Input_Image = cellstr(input_name);
    S.Processed_As = renamed_image;
    S.Binarized_Image = binarized_image;
    S.Volume_Fraction = vol_fr;
    T = struct2table(S'); % convert to table for writing
    % write CSV file
    writetable(T,[path_to_write,'/Image_data.csv']);
else
   zip_file_processing_Otsu(path_to_write);
end

%% ZIP files %%
zip([path_to_write,'/Results.zip'],{'*'},path_to_write);

%% Email to user%%
To = ['To:',user_name];
Subject = ['Subject: Binarization complete for Job ID: ',Job_ID];
Content = 'Content-Type:text/html; charset="us-ascii"';
html_headers = '<html><body>';
%NM_logo = '<img src=''http://129.105.90.149/nm/NanoMine-logo.JPG''>';
Body1 = '<p>Greeting from NanoMine!</p>';
Body2 = '<p>You are receiving this email because you had submitted an image for binarization using Otsu''s Method.';
Body3 = ['The binarization process is complete and you can view the results','<a href= http://nanomine.northwestern.edu:8000/Otsu_view_Result.html?foo=',num2str(Job_ID),'&submit=Send> here</a></p>'];
Body4 = '<p>Best Wishes,</p>';
Body5 = '<p>NanoMine Team.</p>';
Footer1 = '<p>***DO NOT REPLY TO THIS EMAIL***</p>';
html_footer = '</body></html>';
Body = [Body2,Body3];

fileID = fopen('/home/NANOMINE/Production/mdcs/Otsu/email.html','wt+');
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

